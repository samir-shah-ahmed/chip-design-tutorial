module tb;
reg [3:0] a, b;
  wire [3:0] sum;
  wire cout;
  ripple dut(.a(a), .b(b), .sum(sum), .cout(cout));
  initial begin
    a = 4'b0011; b = 4'b0001; #1;
    if (sum !== 4'b0100 || cout !== 1'b0) begin
      $display("FAIL 3+1 -> sum=%b cout=%b", sum, cout);
      $finish;
    end
    a = 4'b1111; b = 4'b0001; #1;
    if (sum !== 4'b0000 || cout !== 1'b1) begin
      $display("FAIL 15+1 -> sum=%b cout=%b", sum, cout);
      $finish;
    end
    $display("PASS ripple");
    $finish;
  end
endmodule
